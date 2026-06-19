const body = document.querySelector('body');
const sidebar = document.querySelector('aside');
const mainContent = document.getElementById('main-content');
const toggleBtn = document.querySelector('.toggle-sidebar-btn');

function toggleSidebar() {
    sidebar.classList.toggle('sidebar-collapsed');
    mainContent.classList.toggle('sidebar-open'); /* Changed to 'sidebar-open' to match CSS */
}

// Initially, we want the sidebar open and the main content shifted
sidebar.classList.remove('sidebar-collapsed');
mainContent.classList.add('sidebar-open'); /* Added to reflect initial state */