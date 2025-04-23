document.addEventListener('DOMContentLoaded', function() {
    const jobSearchForm = document.getElementById('jobSearchForm');
    const jobResults = document.getElementById('jobResults');
    const loadMoreBtn = document.getElementById('loadMore');
    const loadingSpinner = document.getElementById('loading');
    let currentPage = 1;

    jobSearchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        currentPage = 1;
        jobResults.innerHTML = '';
        await searchJobs();
    });

    loadMoreBtn.addEventListener('click', async function() {
        currentPage++;
        await searchJobs();
    });

    async function searchJobs() {
        const keywords = document.getElementById('keywords').value;
        const location = document.getElementById('location').value;
        const country = document.getElementById('country').value;
        const sortBy = document.getElementById('sortBy').value;

        loadingSpinner.style.display = 'block';
        loadMoreBtn.style.display = 'none';

        try {
            const response = await fetch(`/api/jobs/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    keywords,
                    location,
                    country,
                    sortBy,
                    page: currentPage
                })
            });

            const data = await response.json();
            
            if (data.results) {
                renderJobs(data.results);
                loadMoreBtn.style.display = data.results.length === 10 ? 'block' : 'none';
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
            jobResults.innerHTML = '<div class="col-12 text-center">Error loading jobs. Please try again.</div>';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function renderJobs(jobs) {
        const jobCards = jobs.map(job => `
            <div class="col-md-6 col-lg-4">
                <div class="card job-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${job.title}</h5>
                        <p class="job-company mb-2">${job.company.display_name}</p>
                        <p class="job-location mb-2">
                            <i class="bi bi-geo-alt"></i> ${job.location.display_name}
                        </p>
                        ${job.salary_min ? `
                            <p class="job-salary mb-2">
                                <i class="bi bi-currency-dollar"></i> 
                                ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                            </p>
                        ` : ''}
                        <p class="card-text">${job.description.substring(0, 150)}...</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="bi bi-clock"></i> 
                                ${new Date(job.created).toLocaleDateString()}
                            </small>
                            <a href="${job.redirect_url}" target="_blank" class="btn btn-outline-primary btn-sm">
                                Apply Now
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        if (currentPage === 1) {
            jobResults.innerHTML = jobCards;
        } else {
            jobResults.insertAdjacentHTML('beforeend', jobCards);
        }
    }
});