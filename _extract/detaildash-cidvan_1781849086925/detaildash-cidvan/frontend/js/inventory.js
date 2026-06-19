const toggleButtons = document.querySelectorAll('.toggle-button');
const servicesSection = document.getElementById('services-section');
const productsSection = document.getElementById('products-section');

document.addEventListener('DOMContentLoaded', function () {
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
});

const addItemButton = document.getElementById('addItemButton');
const addItemModal = document.getElementById('addItemModal');

const fileInput = document.getElementById('fileInput');
const previewImage = document.getElementById('previewImage');
const removeImageButton = document.getElementById('removeImage');

const customFileName = document.querySelector('.custom-file-name');

fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function () {
            previewImage.src = reader.result;
            previewImage.style.display = 'block';
            removeImageButton.style.display = 'inline-flex';
            customFileName.textContent = file.name;
        }
        reader.readAsDataURL(file);
    } else {
        previewImage.src = "https://placehold.co/100x100/EEE/31343C";
        previewImage.style.display = 'block';
        removeImageButton.style.display = 'none';
        customFileName.textContent = 'Choose file';
    }
});

removeImageButton.addEventListener('click', function () {
    fileInput.value = '';
    previewImage.src = "https://placehold.co/100x100/EEE/31343C";
    previewImage.style.display = 'block';
    removeImageButton.style.display = 'none';
    customFileName.textContent = 'Choose file';
});

addItemModal.addEventListener('hidden.bs.modal', function () {
    fileInput.value = '';
    previewImage.src = "https://placehold.co/100x100/EEE/31343C";
    previewImage.style.display = 'block';
    removeImageButton.style.display = 'none';
    customFileName.textContent = 'Choose file';
});