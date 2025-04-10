// Initialize Ace Editor
const editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/text");
editor.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true,
    showPrintMargin: false,
    highlightActiveLine: true,
    fontSize: "14px"
});

// Make sure the editor is properly sized
editor.container.style.resize = "vertical";
editor.renderer.updateFull();

// Enable typing in the editor
editor.setReadOnly(false);

// Get editor content
window.getEditorContent = function() {
    return editor.getValue();
};

// Set editor content
window.setEditorContent = function(content) {
    editor.setValue(content, -1);
};