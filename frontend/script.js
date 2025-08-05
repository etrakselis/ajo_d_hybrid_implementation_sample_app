function fetchData() {
            const custIdEcrpt = document.getElementById('custIdEcrpt').value;
            const assurance_debug_token = document.getElementById('assuranceDebugToken').value;
            const scopeToMatch = "web://localhost/#hero-banner"; // or set dynamically if needed

            fetch('/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ encrypted_customer_id: custIdEcrpt, debug_token: assurance_debug_token })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('API call failed: ' + response.status);
                    }
                    return response.json();
                })
                .then(json => {
                    const decisions = json.edgeResponse.handle?.find(h => h.type === "personalization:decisions");
                    if (!decisions) {
                        document.getElementById('output').textContent = "No offers found.";
                        return;
                    }

                    // Find the payload object with matching scope
                    const matchedPayload = decisions.payload.find(p => p.scope === scopeToMatch);
                    if (!matchedPayload || !matchedPayload.items) {
                        document.getElementById('output').textContent = "No matching offers found.";
                        return;
                    }

                    else if ((matchedPayload || matchedPayload.items) && matchedPayload.items.length === 0) {

                        document.getElementById('output').textContent = "No offers found.";
                        return;

                        } 

                    let html = '<div class="item-container">';
                    matchedPayload.items.forEach(item => {
                        if (item.data && Array.isArray(item.data.content)) {
                            item.data.content.forEach(contentObj => {
                                html += `
                            <div class="item">
                                <h3>${contentObj["offer-name"] || "No Name"}</h3>
                                <img src="${contentObj.image_url}" alt="${contentObj["offer-name"]}" style="max-width:100%;height:auto;" />
                            </div>
                        `;
                            });
                        }                        

                    });
                    html += '</div>';
                    document.getElementById('output').innerHTML = html;
                    afterFetchData(matchedPayload,custIdEcrpt); // Pass matchedPayload to afterFetchData
                })
                .catch(error => {
                    document.getElementById('output').textContent = 'Error: ' + error.message;
                });
        }

// This function will execute after output is rendered and process each item in matchedPayload
function afterFetchData(matchedPayload,custIdEcrpt) {
    matchedPayload.items.forEach(item => { 
     
        if (item.data && Array.isArray(item.data.content)) {
            item.data.content.forEach(contentObj => {

                // --- Send propositionDisplay event for each offer ---
          alloy("sendEvent", {
            xdm: {
              eventType: "decisioning.propositionDisplay",
              identityMap: {
                    custIdEcrpt: [{
                      id: custIdEcrpt,
                      authenticatedState: "ambiguous",
                      primary: true
                    }]
                  },
                  _paypal: {
                     Identities: {
                          custIdEncrypt: custIdEcrpt
                                 }
                           },
              _experience: {
                decisioning: {
                     propositionAction: {
                      
                      tokens:  [contentObj["tracking-token"]]
                    },
             
                  propositionEventType: { display: 1 }
                }
              },
              web: {
                webPageDetails: {
                  name: "index page"
                },
                webInteraction: {
                  name: `offer-${contentObj["itemID"]}-display`,
                  type: "view"
                }
              }
            }
          })


            });
        }
    });
}

