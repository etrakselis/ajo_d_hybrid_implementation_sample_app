require('dotenv').config();
const express = require('express');
const cors = require('cors');
//const fetch = require('node-fetch'); 
const app = express();


// OAuth-related environment variables
const ims = process.env.IMS;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const scope = process.env.SCOPE;

// Edge API environment variables
const X_GW_IMS_ORG_ID = process.env.X_GW_IMS_ORG_ID;
const X_API_KEY = process.env.X_API_KEY;

//Server port
const port = process.env.PORT;

// Token URL
const tokenUrl = `https://${ims}/ims/token/v3`;

// In-memory token store
let accessToken = null;
let tokenExpiry = null;

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


// Sample request payload for decisioning.propositionFetch
// This is a mock payload that would typically be sent to the Adobe Experience Platform Edge Network
let requestPayload = {
    "event": {
        "xdm": {
            "identityMap": {
                "FPID": [
                    {
                        "id": "xyz",
                        "authenticatedState": "ambiguous",
                        "primary": true
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
            "timestamp": "2025-07-29T15:30:00.000Z",
            "_paypal": {
                "NBAOffer": [
                    {
                        "Product": "PAYLATER",
                        "Rank": 1,
                        "State": "NBA_PAYLATER_MERCH"
                    },
                    {
                        "Product": "PPWC",
                        "Rank": 2,
                         "State": "NBA_PPWC_MER_REP_UPFRONT_OFFER"
                    },
                    {
                        "Product": "PPBL",
                        "Rank": 3,
                         "State": "NBA_PPBL_MER_REP_RE_FINANCE"
                    }
                ]
            }
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
    },
    "meta": {
        "state": {
            "domain": "localhost",
            "cookiesEnabled": true,
            "entries": [
                {
                    "key": "kndctr_C735552962AB1A800A495FFD_AdobeOrg_identity",
                    "value": "abc123"
                },
                {
                    "key": "kndctr_C735552962AB1A800A495FFD_AdobeOrg_cluster",
                    "value": "va6"
                }
            ]
        }
    }
}

// Adobe Edge Network API endpoint for interaction
// This is the endpoint where the request payload would be sent
const postRequestEndpoint = "https://server.adobedc.net/ee/v2/interact?datastreamId=ea8c60da-4651-411f-a576-832a39776958"

app.post('/api', async (req, res) => {
    try {
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
            'Content-Type': 'application/json'
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
        res.json(data);
    } catch (err) {
        console.error('Error in /api:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
});