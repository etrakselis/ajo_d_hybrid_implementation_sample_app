const express = require('express');
const app = express();
const PORT = 8000;

app.use(express.json()); 

const nba_response_payload = {
  "data": {
    "merchant": {
      "insights": {
        "aiRecommendations": {
          "rankedRecommendations": [
            {
              "product": "PAYLATER",
              "state": "NBA_PAYLATER_MERCH",
              "rank": 1,
              "dynamicAttributes": null
            },
            {
              "product": "PPWC",
              "state": "NBA_PPWC_MER_REP_UPFRONT_OFFER",
              "rank": 2,
              "dynamicAttributes": [
                {
                  "key": "LOAN_AMOUNT",
                  "value": "5000"
                },
                {
                  "key": "EXPIRY_DATE",
                  "value": "2025-12-31"
                }
              ]
            },
            {
              "product": "PPBL",
              "state": "NBA_PPBL_MER_REP_RE_FINANCE",
              "rank": 3,
              "dynamicAttributes": null
            }
          ]
        }
      }
    }
  },
  "extensions": {
    "correlationId": "1b7dc988efbbf"
  }
}

app.post('/api/nba_rankings', (req, res) => {
  // Ingest encrypted_customer_id from the request body
  const encryptedCustomerId = req.body.encrypted_customer_id;

  // Transformer4Rec AI ranking model provides product rankings and state
  function Transformer4Rec(encryptedCustomerId) {
    
    return nba_response_payload;
  }

  // Serve the output of Transformer4Rec as the response
  res.json(Transformer4Rec(encryptedCustomerId));
});

app.listen(PORT, () => {
  console.log(`NBA API running on http://localhost:${PORT}`);
});