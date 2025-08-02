function fetchData() {
            const custIdEcrpt = document.getElementById('custIdEcrpt').value;
            fetch(`/api?custIdEcrpt=${encodeURIComponent(custIdEcrpt)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('API call failed: ' + response.status);
                    }
                    return response.json();
                })
                .then(json => {
                    // Find the personalization:decisions payload
                    const decisions = json.handle?.find(h => h.type === "personalization:decisions");
                    if (!decisions) {
                        document.getElementById('output').textContent = "No offers found.";
                        return;
                    }
                    // Get all items and their content arrays
                    let html = '<div class="item-container">';
                    decisions.payload.forEach(payloadObj => {
                        if (payloadObj.items) {
                            payloadObj.items.forEach(item => {
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
                        }
                    });
                    html += '</div>';
                    document.getElementById('output').innerHTML = html;
                })
                .catch(error => {
                    document.getElementById('output').textContent = 'Error: ' + error.message;
                });
        }

