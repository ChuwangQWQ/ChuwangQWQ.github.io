function copyCode() {
    const output = document.getElementById('code-output');
    navigator.clipboard.writeText(output.value).then(() => alert('已复制到剪贴板'));
}