const displayedImage = document.querySelector('.displayed-img');
const prevButton = document.querySelector('.prev');
const nextButton = document.querySelector('.next');

/* Declaring the array of image filenames and alt texts */
const filenames = ["../../portfolio/images/img(1).png", "../../portfolio/images/proj1search.png", "../../portfolio/images/proj1login.png", "../../portfolio/images/proj1user.png"];
const altTexts = ["Watch L8R Image 1", "Watch L8R Image 2", "Watch L8R Image 3", "Watch L8R Image 4", "Watch L8R Image 5"];


let currentIndex = 0;


function updateImage(index) {
    displayedImage.setAttribute('src', filenames[index]);
    displayedImage.setAttribute('alt', altTexts[index]);
}

/* event listeners for nav buttons */
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