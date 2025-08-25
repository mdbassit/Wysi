let editors = {};

// Basic demo
editors.demo1 = Wysi({
    el: '#demo1',
    height: 300,
    onChange: (content) => {
        // Optional: show content changes
    }
});

// Full demo
editors.demo2 = Wysi({
    el: '#demo2',
    height: 300,
    tools: [
        'format', '|', 
        'bold', 'italic', 'underline', 'strike',
    ],

});

// Dark mode demo
editors.demo3 = Wysi({
    el: '#demo3',
    darkMode: true,
    height: 300
});

// Auto grow demo
editors.demo4 = Wysi({
    el: '#demo4',
    autoGrow: true,
    height: 100
});

// Demo tabs functionality
function showDemo(demoType) {
    // Hide all demos
    document.querySelectorAll('.demo-editor').forEach(demo => {
        demo.style.display = 'none';
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.demo-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected demo
    document.getElementById(demoType + '-demo').style.display = 'block';
    
    // Add active class to clicked tab
    event.target.classList.add('active');
}

// Copy code functionality
function copyCode(codeType) {
    const codeElement = document.getElementById(codeType + '-code');
    const textArea = document.createElement('textarea');
    textArea.value = codeElement.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // Show feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#27ca3f';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '#667eea';
    }, 1000);
}

// Smooth scrolling for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});