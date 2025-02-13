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

/*alternate typewriter text*/
document.addEventListener("DOMContentLoaded", () => {
    const textElement = document.getElementById("typewriter-text");
    const texts = ["ARI GLADSTONE", "haru"];
    let index = 0;

    function typeWriterAnimation() {
        let text = texts[index];
        let charIndex = 0;
        textElement.textContent = ""; //clear

        // Typing effect
        const typingInterval = setInterval(() => {
            if (charIndex < text.length) {
                textElement.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typingInterval);
                //pause
                setTimeout(() => deleteText(), 1000);
            }
        }, 150);
    }

    // function deleteText() {
    //     let text = textElement.textContent;
    //     let charIndex = text.length;

    //     //delete effect
    //     const deletingInterval = setInterval(() => {
    //         if (charIndex > 0) {
    //             textElement.textContent = text.slice(0, charIndex - 1);
    //             charIndex--;
    //         } else {
    //             clearInterval(deletingInterval);
    //             //move to next text
    //             index = (index + 1) % texts.length; //cycle to prev text
    //             setTimeout(() => typeWriterAnimation(), 500); //pause
    //         }
    //     }, 100);
    // }

    typeWriterAnimation();
});

//apologies
// Function to detect mobile devices
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Show alert if on a mobile device
if (isMobileDevice()) {
    alert("Mobile version is a work in progress. Please view this on a desktop in the meantime.");
}