module.exports = {
    title: "Obsidian Vault",
    link: "https://obsidian.md",
    icon: "obsidian.png",
    description: "Connect A-LAB.TECH Docs as a Knowledge Base",
    run: [{
        method: "web.open",
        params: {
            url: "obsidian://open?path={{path.resolve(cwd, '../../..')}}"
        }
    }, {
        method: "notify",
        params: {
            html: "Attempting to open A-LAB.TECH vault in Obsidian. If it doesn't open, ensure Obsidian is installed.",
            href: "https://obsidian.md/download",
            target: "_blank"
        }
    }]
}
