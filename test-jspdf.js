import('jspdf').then(m => {
  try {
    console.log("m.jsPDF is:", typeof m.jsPDF);
    console.log("m.default is:", typeof m.default);
    
    // Check if m.default has jsPDF
    if (m.default && typeof m.default.jsPDF === 'function') {
        console.log("m.default.jsPDF is a function");
    }

    const constructor = typeof m.jsPDF === 'function' ? m.jsPDF : (typeof m.default === 'function' ? m.default : m.default.jsPDF);
    new constructor();
    console.log("Success with constructor");
  } catch(e) {
    console.error("Error:", e.message);
  }
});