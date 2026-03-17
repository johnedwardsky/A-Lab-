module.exports = {
  title: "Antigravity",
  link: "https://antigravity.google/",
  icon: "antigravity.png",
  description: "The AI IDE from Google",
  run: [{
    // Check if antigravity is in PATH or in the default /Applications installation path
    when: "{{which('antigravity') || exists('/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity')}}",
    method: "exec",
    params: {
      // Use the full path if 'antigravity' is not found in PATH
      message: "{{which('antigravity') ? 'antigravity .' : '/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity .'}}",
      path: "{{args.cwd}}",
    }
  }, {
    when: "{{!which('antigravity') && !exists('/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity')}}",
    method: "notify",
    params: {
      html: "Antigravity is not installed. Click to visit the Google Antigravity homepage to download",
      href: "https://antigravity.google/download",
      target: "_blank"
    }
  }]
}
