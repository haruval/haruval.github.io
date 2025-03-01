// Global variable to store projects data
let proj;

// Load projects data from JSON file
document.addEventListener("DOMContentLoaded", () => {
    // Check if we're on the projects page
    const projectsContainer = document.getElementById("projects");
    
    if (projectsContainer) {
        fetch('./projects.json') 
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
        
        // Create project element
        const projectElement = document.createElement('a');
        projectElement.href = project.link;
        projectElement.className = "project-link";
        
        projectElement.innerHTML = `
            <div class="row project" id="${project.subdomain}">
                <div class="projimg">
                    <img src="./images/img(${i + 1}).png" alt="${project.name}">
                </div>
                <div class="description">
                    <h2>${project.name}</h2>
                    <h3 class="subtitle">${project.subtitle}</h3>
                    <p class="abstract">${project.abstract}</p>
                </div>
            </div>`;
            
        projectsContainer.appendChild(projectElement);
    }
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