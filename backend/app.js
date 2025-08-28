//Dependencies
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Only allow requests from website
const allowedOrigin = 'https://edwintrakselis.com';

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // Block requests with no Origin (e.g., curl, Postman)
      return callback(new Error('Missing Origin header'), false);
    }
    if (origin === allowedOrigin) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
}));

app.use(express.json()); 


// OAuth-related environment variables
const ims = process.env.IMS;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const scope = process.env.SCOPE;

// OAuth 2.0 Session Token URL
const tokenUrl = `https://${ims}/ims/token/v3`;

// Edge API environment variables
const X_GW_IMS_ORG_ID = process.env.X_GW_IMS_ORG_ID;
const X_API_KEY = process.env.X_API_KEY;
const DATASTREAM_ID = process.env.DATASTREAM_ID;

//Server port
const port = process.env.PORT;

// In-memory token store
let accessToken = null;
let tokenExpiry = null;



// Sample request payload for decisioning.propositionFetch
// This is a mock payload that would typically be sent to the Adobe Experience Platform Edge Network
let requestPayload = {
    "event": {
        "xdm": {
            "identityMap": {
                "custIdEcrpt": [
                    {
                        "id": "",
                        "authenticatedState": "ambiguous",
                        "primary": true
                    }
                ],
                "FPID": [
                    {
                        "id": "",
                        "authenticatedState": "ambiguous",
                        "primary": false
                    }
                ]
            },
            "eventType": "decisioning.propositionFetch",
            "web": {
                "webPageDetails": {
                    "URL": "https://localhost/",
                    "name": "hero-banner"
                }
            },
            "timestamp": new Date().toISOString(), // UTC timezone
        }
    },
    "query": {
        "identity": {
            "fetch": [
                "ECID"
            ]
        },
        "personalization": {
            "surfaces": [
                "web://localhost/#hero-banner"
            ]
        }
    }
}

// Adobe Edge Network API endpoint for interaction
// This is the endpoint where the request payload would be sent
const postRequestEndpoint = `https://server.adobedc.net/ee/v2/interact?datastreamId=${DATASTREAM_ID}`;

// Helper function to transform NBA Ranking API response to sample.json structure
function extractNbaOffers(nbaRankingData, encryptedCustomerId) {
    const offers = [];
    const rankedRecommendations = nbaRankingData?.data?.merchant?.insights?.aiRecommendations?.rankedRecommendations || [];
    rankedRecommendations.forEach(rec => {
        offers.push({
            Product: rec.product,
            Rank: rec.rank,
            State: rec.state
        });
    });
    return {
        _paypal: {            
            paypalDemographics: {
                enterpriseCustLang: "en_US"
            },
            Identities: {
                custIdEncrypt: encryptedCustomerId
            },
            NBAOffer: offers
        }
    };
}

app.post('/api', async (req, res) => {
    try {
        const encryptedCustomerId = req.body.encrypted_customer_id;
        const assurance_debug_token = req.body.debug_token;

        // Helper function to call NBA Ranking API
        async function fetchNbaRanking(encryptedCustomerId) {
            const nbaResponse = await fetch('http://localhost:8000/api/nba_rankings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encrypted_customer_id: encryptedCustomerId })
            });
            if (!nbaResponse.ok) {
                const errorText = await nbaResponse.text();
                throw new Error('NBA Ranking API request failed: ' + errorText);
            }
            return await nbaResponse.json();
        }

        // Call NBA Ranking API and store response
        const nbaRankingData = await fetchNbaRanking(encryptedCustomerId);

        // Extract the products section from the NBA rankings payload
        const nbaProductsJson = extractNbaOffers(nbaRankingData,encryptedCustomerId);

        // Helper to fetch new token
        async function fetchNewToken() {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: clientId,
                    client_secret: clientSecret,
                    scope: scope
                })
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error('OAuth request failed: ' + error);
            }
            const data = await response.json();
            accessToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in * 1000);
        }

        // Check if token exists and is valid, else renew
        if (!accessToken || !tokenExpiry || Date.now() > tokenExpiry) {
            await fetchNewToken();
        }

        // Prepare headers for Adobe Edge Network API
        const headers = {
            'x-api-key': X_API_KEY,
            'x-gw-ims-org-id': X_GW_IMS_ORG_ID,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'x-adobe-aep-validation-token': assurance_debug_token
        };

        // update the requestPayload before sending to Adobe Edge Network  
         requestPayload.event.xdm.identityMap.custIdEcrpt[0].id = encryptedCustomerId;
         requestPayload.event.xdm.identityMap.FPID[0].id = encryptedCustomerId;          
            requestPayload.event.xdm = {             
            ...requestPayload.event.xdm,
            ...nbaProductsJson

        };

        // Make POST request to Adobe Edge Network
        const response = await fetch(postRequestEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Adobe Edge API request failed', detail: errorText });
        }

        const data = await response.json();
        // Return Adobe Edge response 
        res.json({ edgeResponse : data });
    } catch (err) {
        console.error('Error in /api:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
});