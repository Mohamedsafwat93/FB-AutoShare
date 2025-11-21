document.addEventListener('DOMContentLoaded', function () {

    // بيانات Sales
    const salesData = {
        labels: ['January', 'February', 'March', 'April', 'May'],
        datasets: [{
            label: 'Sales',
            data: [10, 20, 15, 30, 25],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
        }]
    };

    const salesConfig = {
        type: 'bar',
        data: salesData,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Sales Dashboard' }
            }
        }
    };

    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) new Chart(salesCtx, salesConfig);

    // بيانات Users
    const usersData = {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        datasets: [{
            label: 'Active Users',
            data: [120, 150, 180, 140, 200],
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
        }]
    };

    const usersConfig = {
        type: 'line',
        data: usersData,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Users Dashboard' }
            }
        }
    };

    const usersCtx = document.getElementById('usersChart');
    if (usersCtx) new Chart(usersCtx, usersConfig);

});
