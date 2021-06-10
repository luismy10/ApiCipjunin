document.addEventListener('DOMContentLoaded', function() {
    // fetch('http://localhost:5000/getAll')
    //     .then(response => response.json())
    //     .then(result => { console.log(result) })
    //     .catch(error => console.log(error));
    loadHTMLTable([]);
    loadHTMLButton();
});

function loadHTMLTable(data) {
    const table = document.querySelector('table tbody');
    if (data.length === 0) {
        table.innerHTML = "<tr><td class='no-data' colspan='5'>No Data</td></tr>";
    }
}

function loadHTMLButton() {
    const buttonSave = document.getElementById('product-btn');
    const buttonSearch = document.getElementById('search-btn');
    buttonSave.addEventListener('click', function(event) {
        let product_name = document.getElementById('name-input');
        let product_price = document.getElementById('price-input');
        let numeric = !isNaN(parseFloat(product_price.value)) && isFinite(product_price.value);
        if (product_name.value.length === 0) {
            product_name.focus();
        } else if (!numeric) {
            product_price.focus();
        } else {
            fetch('http://localhost:5000/api/products/addproduct', {
                method: 'POST',
                body: JSON.stringify({
                    "product_name": product_name.value,
                    "product_price": product_price.value
                }),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw "No se puedo completar la petición";
                }
            }).then(result => {
                console.log("Result=>" + result)
            }).catch(error => {
                console.log("Error=>" + error)
            });
        }

    });

    buttonSearch.addEventListener('click', function() {

        let product_name = document.getElementById('search-input');
        fetch('http://localhost:5000/api/products/' + (product_name.value.length === 0 ? 'novalue' : product_name.value), {
            method: 'GET'
        }).then(response => {
            console.log(response)
            if (response.ok) {
                return response.json();
            } else {
                throw "No se puedo completar la petición";
            }
        }).then(result => {
            console.log(result)
            if (result.state === 1) {
                let data = result.result;
                if (data.length !== 0) {
                    console.log(data)
                } else {
                    console.log("Sin datos")
                }
            } else {

            }

        }).catch(error => {
            console.log("Error=>" + error)
        });

    });
}