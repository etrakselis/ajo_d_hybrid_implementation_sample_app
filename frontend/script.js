 function fetchData() {
            fetch('/api')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('API call failed: ' + response.status);
                    }
                    return response.text();
                })
                .then(data => {
                    document.getElementById('output').textContent = data;
                })
                .catch(error => {
                    document.getElementById('output').textContent = 'Error: ' + error.message;
                });
        }

