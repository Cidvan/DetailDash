const toggleButtons = document.querySelectorAll('.toggle-button');
const servicesSection = document.getElementById('services-section');
const productsSection = document.getElementById('products-section');

document.addEventListener('DOMContentLoaded', function () {
    // Fetch and populate categories for products and services
    fetch('/api/product-categories')
        .then(response => response.json())
        .then(categories => {
            const productCategorySelect = document.getElementById('productCategory');
            productCategorySelect.innerHTML = '<option selected>Select category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                productCategorySelect.appendChild(option);
            });
        });

    fetch('/api/service-categories')
        .then(response => response.json())
        .then(categories => {
            const serviceCategorySelect = document.getElementById('serviceCategory');
            serviceCategorySelect.innerHTML = '<option selected>Select category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                serviceCategorySelect.appendChild(option);
            });
        });

    toggleButtons.forEach(button => {
        button.addEventListener('click', function () {
            toggleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            servicesSection.classList.remove('active');
            productsSection.classList.remove('active');
            document.getElementById(section + '-section').classList.add('active');
        });
    });

    loadServices();
    loadProducts();

    // Add event listeners for edit and delete buttons after loading data
    // For products
    document.querySelectorAll('#products-section .edit').forEach(button => {
        button.addEventListener('click', onEditProduct);
    });
    document.querySelectorAll('#products-section .delete').forEach(button => {
        button.addEventListener('click', onDeleteProduct);
    });

    // For services
    document.querySelectorAll('#services-section .edit').forEach(button => {
        button.addEventListener('click', onEditService);
    });
    document.querySelectorAll('#services-section .delete').forEach(button => {
        button.addEventListener('click', onDeleteService);
    });
});

const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));

const productForm = document.getElementById('productForm');
const serviceForm = document.getElementById('serviceForm');

const productSaveBtn = document.getElementById('productSaveBtn');
const serviceSaveBtn = document.getElementById('serviceSaveBtn');

const productsTableBody = document.querySelector('#products-section tbody');
const servicesTableBody = document.querySelector('#services-section tbody');

let editingProductId = null;
let editingServiceId = null;

document.getElementById('addItemButton').addEventListener('click', () => {
    const activeSection = document.querySelector('.toggle-button.active').getAttribute('data-section');
    if (activeSection === 'products') {
        clearProductForm();
        editingProductId = null;
        productModal.show();
    } else {
        clearServiceForm();
        editingServiceId = null;
        serviceModal.show();
    }
});

function clearProductForm() {
    productForm.reset();
    document.getElementById('productPreviewImage').src = "https://placehold.co/100x100/EEE/31343C";
    document.getElementById('productRemoveImage').style.display = 'none';
    document.getElementById('productFileInput').value = '';
}

function clearServiceForm() {
    serviceForm.reset();
    document.getElementById('servicePreviewImage').src = "https://placehold.co/100x100/EEE/31343C";
    document.getElementById('serviceRemoveImage').style.display = 'none';
    document.getElementById('serviceFileInput').value = '';
}

document.getElementById('productFileButton').addEventListener('click', function () {
    document.getElementById('productFileInput').click();
});

document.getElementById('productFileInput').addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('productPreviewImage').src = e.target.result;
            document.getElementById('productRemoveImage').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('productRemoveImage').addEventListener('click', function () {
    document.getElementById('productFileInput').value = '';
    document.getElementById('productPreviewImage').src = "https://placehold.co/100x100/EEE/31343C";
    this.style.display = 'none';
});

document.getElementById('serviceFileButton').addEventListener('click', function () {
    document.getElementById('serviceFileInput').click();
});

document.getElementById('serviceFileInput').addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('servicePreviewImage').src = e.target.result;
            document.getElementById('serviceRemoveImage').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('serviceRemoveImage').addEventListener('click', function () {
    document.getElementById('serviceFileInput').value = '';
    document.getElementById('servicePreviewImage').src = "https://placehold.co/100x100/EEE/31343C";
    this.style.display = 'none';
});

function loadProducts() {
    fetch('/api/products')
        .then(response => response.json())
        .then(products => {
            productsTableBody.innerHTML = '';
            products.forEach(product => {
                const tr = document.createElement('tr');
                const imageUrl = product.image_path && product.image_path !== 'null' ? `/static/assets/images/uploads/${product.image_path}` : "https://placehold.co/80x80/EEE/31343C";
                tr.innerHTML = `
                    <td>
                        <div class="menu-item">
                            <img src="${imageUrl}" alt="${product.name}">
                        </div>
                    </td>
                    <td>
                        <div class="menu-item">
                            <div class="item-details">
                                <h3 class="item-name">${product.name}</h3>
                            </div>
                        </div>
                    </td>
                    <td>${product.category || ''}</td>
                    <td>$${product.price}</td>
                    <td>${product.quantity}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="edit" data-id="${product.id}" data-type="product"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                            <button class="delete" data-id="${product.id}" data-type="product"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                        </div>
                    </td>
                `;
                productsTableBody.appendChild(tr);
            });
            document.querySelectorAll('#products-section .edit').forEach(button => {
                button.addEventListener('click', onEditProduct);
            });
            document.querySelectorAll('#products-section .delete').forEach(button => {
                button.addEventListener('click', onDeleteProduct);
            });
        });
}

function loadServices() {
    fetch('/api/services')
        .then(response => response.json())
        .then(services => {
            servicesTableBody.innerHTML = '';
            services.forEach(service => {
                const tr = document.createElement('tr');
                const imageUrl = service.image_path && service.image_path !== 'null' ? `/static/assets/images/uploads/${service.image_path}` : "https://placehold.co/80x80/EEE/31343C";
                tr.innerHTML = `
                    <td>
                        <div class="menu-item">
                            <img src="${imageUrl}" alt="${service.name}">
                        </div>
                    </td>
                    <td>
                        <div class="menu-item">
                            <div class="item-details">
                                <h3 class="item-name">${service.name}</h3>
                            </div>
                        </div>
                    </td>
                    <td>${service.category}</td>
                    <td>$${service.price}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="edit" data-id="${service.id}" data-type="service"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                            <button class="delete" data-id="${service.id}" data-type="service"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                        </div>
                    </td>
                `;
                servicesTableBody.appendChild(tr);
            });
            document.querySelectorAll('#services-section .edit').forEach(button => {
                button.addEventListener('click', onEditService);
            });
            document.querySelectorAll('#services-section .delete').forEach(button => {
                button.addEventListener('click', onDeleteService);
            });
        });
}

function onEditProduct(event) {
    const id = event.currentTarget.getAttribute('data-id');
    fetch(`/api/products/${id}`)
        .then(response => response.json())
        .then(product => {
            editingProductId = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category || 'Select category';
            document.getElementById('productSalePrice').value = product.price;
            document.getElementById('productQuantity').value = product.quantity;
            productModal.show();
        });
}

function onEditService(event) {
    const id = event.currentTarget.getAttribute('data-id');
    fetch(`/api/services/${id}`)
        .then(response => response.json())
        .then(service => {
            editingServiceId = service.id;
            document.getElementById('serviceName').value = service.name;
            document.getElementById('serviceCategory').value = service.category || 'Select category';
            document.getElementById('serviceSalePrice').value = service.price;
            serviceModal.show();
        });
}

function onDeleteProduct(event) {
    const id = event.currentTarget.getAttribute('data-id');
    if (confirm('Are you sure you want to delete this product?')) {
        fetch(`/api/products/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.error) alert(data.error);
                else loadProducts();
            });
    }
}

function onDeleteService(event) {
    const id = event.currentTarget.getAttribute('data-id');
    if (confirm('Are you sure you want to delete this service?')) {
        fetch(`/api/services/${id}`, { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                if (data.error) alert(data.error);
                else loadServices();
            });
    }
}

productSaveBtn.addEventListener('click', () => {
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseFloat(document.getElementById('productSalePrice').value);
    const quantity = parseInt(document.getElementById('productQuantity').value);

    if (!name || isNaN(price) || isNaN(quantity)) {
        alert('Please fill in all required fields correctly.');
        return;
    }

    const productFileInput = document.getElementById('productFileInput');
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('quantity', quantity);
    if (productFileInput.files.length > 0) {
        formData.append('image', productFileInput.files[0]);
    }

    if (editingProductId) {
        fetch(`/api/products/${editingProductId}`, {
            method: 'PUT',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) alert(data.error);
            else {
                loadProducts();
                editingProductId = null;
                productModal.hide();
            }
        });
    } else {
        fetch('/api/products', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) alert(data.error);
            else {
                loadProducts();
                productModal.hide();
            }
        });
    }
});

serviceSaveBtn.addEventListener('click', () => {
    const name = document.getElementById('serviceName').value.trim();
    const category = document.getElementById('serviceCategory').value;
    const price = parseFloat(document.getElementById('serviceSalePrice').value);

    if (!name || isNaN(price)) {
        alert('Please fill in all required fields correctly.');
        return;
    }

    const serviceFileInput = document.getElementById('serviceFileInput');
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    if (serviceFileInput.files.length > 0) {
        formData.append('image', serviceFileInput.files[0]);
    }

    if (editingServiceId) {
        fetch(`/api/services/${editingServiceId}`, {
            method: 'PUT',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) alert(data.error);
            else {
                loadServices();
                editingServiceId = null;
                serviceModal.hide();
            }
        });
    } else {
        fetch('/api/services', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) alert(data.error);
            else {
                loadServices();
                serviceModal.hide();
            }
        });
    }
});
