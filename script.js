let editors = {};

// Basic demo
editors.demo1 = Wysi({
    el: '#demo1',
    height: 350,
    onChange: (content) => {
        // Optional: show content changes
    }
});

// Full demo
editors.demo2 = Wysi({
    el: '#demo2',
    height: 200,
    tools: [
        'format', '|', 
        'bold', 'italic', 'underline', 'strike',
    ],

});

// Dark mode demo
editors.demo3 = Wysi({
    el: '#demo3',
    darkMode: true,
    height: 200
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
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.boxShadow = 'none';
    }
});