// Global variable to store projects data
let proj;

// Load projects data from JSON file
document.addEventListener("DOMContentLoaded", () => {
    // Check if we're on the projects page
    const projectsContainer = document.getElementById("projects");
    
    if (projectsContainer) {
        fetch('/portfolio/projects.json') 
            .then(response => response.json())
            .then((projects) => {
                proj = projects;
                parseData(projects); 
                
                // Set up filter buttons after projects are loaded
                setupFilterButtons();
            })
            .catch((err) => {
                console.error(`error: ${err}`);
                // Show a fallback message if JSON fails to load
                if (projectsContainer) {
                    projectsContainer.innerHTML = "<p style='color: white; text-align: center;'>Unable to load projects. Please try again later.</p>";
                }
            });
    }
    
    // Handle typewriter effect on homepage
    initTypewriter();
    
    // Handle transitions
    setupTransitions();
});

// Function to parse and display project data
function parseData(data) {
    const projectsContainer = document.getElementById("projects");
    if (!projectsContainer) return;
    
    projectsContainer.innerHTML = ""; 

    for (let i = 0; i < data.projects.length; i++) {
        const project = data.projects[i];
        const imagePath = normalizePortfolioImagePath(project.image || `./images/img(${i + 1}).png`);
        const imageMarkup = project.image === false ? "" : `
                <div class="projimg">
                    <img src="${imagePath}" alt="${project.alt || project.name}">
                </div>`;
        const githubMarkup = project.github ? `
                    <a class="github-project-link" href="${project.github}" target="_blank" rel="noopener noreferrer" aria-label="View ${project.name} on GitHub (opens in a new tab)">
                        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
                        <span>View on GitHub</span>
                    </a>` : "";
        const projectPageMarkup = project.link ? `
                    <a class="project-page-link" href="${project.link}" aria-label="View the ${project.name} project page">
                        <span>View Project Page</span>
                    </a>` : "";
        
        // Create project element
        const projectElement = document.createElement('div');
        projectElement.className = "project-link";

        if (project.link) {
            // Internal pages navigate in place; external links open a new tab.
            const openLink = project.link.startsWith("/")
                ? () => { window.location.href = project.link; }
                : () => { window.open(project.link, "_blank", "noopener,noreferrer"); };
            projectElement.setAttribute("role", "link");
            projectElement.tabIndex = 0;
            projectElement.addEventListener("click", (event) => {
                if (!event.target.closest("a")) {
                    openLink();
                }
            });
            projectElement.addEventListener("keydown", (event) => {
                if (event.target === projectElement && event.key === "Enter") {
                    openLink();
                }
            });
        }
        
        const actionsMarkup = (projectPageMarkup || githubMarkup) ? `
                <div class="project-actions">${projectPageMarkup}${githubMarkup}
                </div>` : "";
        const stackMarkup = Array.isArray(project.stack) && project.stack.length ? `
                    <div class="project-stack">
                        <span class="stack-label">stack</span>
                        <span class="stack-items">${project.stack.join(", ")}</span>
                    </div>` : "";

        projectElement.innerHTML = `
            <div class="row project" id="${project.subdomain}">
                <div class="project-main">
                    <div class="project-heading">
                        <h2>${project.name}</h2>
                        <h3 class="subtitle">${project.subtitle}</h3>
                    </div>
${imageMarkup}
                    <div class="project-text">
                        <p class="abstract">${project.abstract}</p>
                    </div>
${stackMarkup}
                </div>
${actionsMarkup}
            </div>`;
            
        projectsContainer.appendChild(projectElement);
    }
}

function normalizePortfolioImagePath(path) {
    if (path.startsWith("./images/")) {
        return path.replace("./images/", "/portfolio/images/");
    }

    return path;
}

// Set up filter buttons
function setupFilterButtons() {
    const buttons = document.querySelectorAll("#buttons button");
    if (buttons.length === 0) return;
    
    buttons.forEach((button) => {
        button.addEventListener("click", (e) => {
            console.log(`Button clicked: ${e.target.value}`); 
            sortProjects(e.target.value);
        });
    });
}

// Filter projects by category
function sortProjects(category) {
    if (!proj || !proj.projects) {
        console.error("Projects data not loaded yet.");
        return;
    }

    // Get all project elements by their links
    const projectLinks = document.querySelectorAll(".project-link");
    
    projectLinks.forEach((link) => {
        const projectElement = link.querySelector(".project");
        const projectId = projectElement.id;
        
        // Find the corresponding project data
        const projectData = proj.projects.find(p => p.subdomain === projectId);
        
        if (projectData) {
            if (category === "clear") {
                link.style.display = "block"; // Show all projects
            } else if (projectData.category === category) {
                link.style.display = "block"; // Show matching category
            } else {
                link.style.display = "none"; // Hide non-matching
            }
        }
    });
}

// Initialize typewriter effect
function initTypewriter() {
    const textElement = document.getElementById("typewriter-text");
    if (!textElement) return;
    
    // Simply set the text without animation
    textElement.textContent = "ARI GLADSTONE";
}

// Set up page transitions
function setupTransitions() {
    // Attach click event listeners to navbar links
    const navLinks = document.querySelectorAll("a.nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault(); // Prevent default navigation
            const href = link.getAttribute("href"); // Get the target href

            // Add fade-out class
            document.body.classList.add("fade-out");

            // Wait for the animation to complete, then navigate
            setTimeout(() => {
                window.location.href = href;
            }, 1000); // Transition duration
        });
    });
}

// Carousel functionality for project pages
document.addEventListener('DOMContentLoaded', function() {
    const displayedImage = document.querySelector('.displayed-img');
    const prevButton = document.querySelector('.prev');
    const nextButton = document.querySelector('.next');
    
    if (displayedImage && prevButton && nextButton) {
        // Set initial image (if needed)
        updateImage(0);
        
        // Add event listeners
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            currentIndex = (currentIndex - 1 + filenames.length) % filenames.length;
            updateImage(currentIndex);
        });
        
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            currentIndex = (currentIndex + 1) % filenames.length;
            updateImage(currentIndex);
        });
    }
});

// Variables for carousel (if present)
let currentIndex = 0;
const filenames = ["../../portfolio/images/img(1).png", "../../portfolio/images/proj1search.png", "../../portfolio/images/proj1login.png", "../../portfolio/images/proj1user.png"];
const altTexts = ["Watch L8R Image 1", "Watch L8R Image 2", "Watch L8R Image 3", "Watch L8R Image 4", "Watch L8R Image 5"];

// Function to update carousel image
function updateImage(index) {
    const displayedImage = document.querySelector('.displayed-img');
    if (!displayedImage) return;
    
    displayedImage.setAttribute('src', filenames[index]);
    displayedImage.setAttribute('alt', altTexts[index]);
}
