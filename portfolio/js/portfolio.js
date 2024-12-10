let proj;


fetch('./projects.json') 
    .then(response => response.json())
    .then((projects) => {
        proj = projects;
        parseData(projects); 
    })
    .catch((err) => {
        console.error(`error: ${err}`);
    });


// function parseData(data) {
//     const projectsContainer = document.getElementById("projects");
//     projectsContainer.innerHTML = ""; 

//     for (let i = 0; i < data.projects.length; i++) {
//         const project = data.projects[i];
//         projectsContainer.innerHTML += `
//             <div class="row project" id="${project.subdomain}">
//                 <div class="projimg">
//                     <img src="./images/img(${i + 1}).png" alt="${project.name}">
//                 </div>
//                 <div class="description">
//                     <h2>${project.name}</h2>
//                     <h3 class="subtitle">${project.subtitle}</h3>
//                     <p class="abstract">${project.abstract}</p>
//                 </div>
//             </div>`;
//     }
// }

// added clickable link
function parseData(data) {
    const projectsContainer = document.getElementById("projects");
    projectsContainer.innerHTML = ""; 

    for (let i = 0; i < data.projects.length; i++) {
        const project = data.projects[i];
        projectsContainer.innerHTML += `
            <a href="${project.link}" class="project-link">
                <div class="row project" id="${project.subdomain}">
                    <div class="projimg">
                        <img src="./images/img(${i + 1}).png" alt="${project.name}">
                    </div>
                    <div class="description">
                        <h2>${project.name}</h2>
                        <h3 class="subtitle">${project.subtitle}</h3>
                        <p class="abstract">${project.abstract}</p>
                    </div>
                </div>
            </a>`;
    }
}

//filter buttons
document.querySelectorAll("#buttons button").forEach((button) => {
    button.addEventListener("click", (e) => {
        console.log(`Button clicked: ${e.target.value}`); 
        sortProjects(e.target.value);
    });
});


function sortProjects(category) {
    if (!proj || !proj.projects) {
        console.error("Projects data not loaded yet.");
        return;
    }

    proj.projects.forEach((project) => {
        const projectElement = document.getElementById(project.subdomain);
        if (projectElement) {
            if (category === "clear") {
                projectElement.style.display = "flex"; // Show all projects
            } else if (project.category === category) {
                projectElement.style.display = "flex"; // Show matching category
            } else {
                projectElement.style.display = "none"; // Hide non-matching
            }
        }
    });
}


// TRANSITION STUFF 
document.addEventListener("DOMContentLoaded", () => {
    // Attach click event listeners to all navbar links
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
            }, 0o1); // Matches the fadeOut duration (1s)
        });
    });
});