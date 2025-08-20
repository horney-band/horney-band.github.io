const path = require("path")

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("*.png")
  eleventyConfig.addPassthroughCopy("*.jpg")
  eleventyConfig.addPassthroughCopy("*.jpeg")
  eleventyConfig.addPassthroughCopy("*.gif")
  eleventyConfig.addPassthroughCopy("*.svg")
  eleventyConfig.addPassthroughCopy("*.webp")
  eleventyConfig.addPassthroughCopy("*.ico")
  eleventyConfig.addPassthroughCopy("*.mp4")
  eleventyConfig.addPassthroughCopy("*.mp3")
  eleventyConfig.addPassthroughCopy("*.css")
  eleventyConfig.addPassthroughCopy("CNAME")
  eleventyConfig.addPassthroughCopy("style/**/*")
  eleventyConfig.addPassthroughCopy("images/**/*")

  // Custom permalink for pages directory - route pages/name.html to /name/
  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => {
      if (data.page.inputPath.startsWith("./pages/")) {
        const basename = path.basename(data.page.inputPath, ".html")
        return `/${basename}/index.html`
      }
      return false
    }
  })

  return {
    dir: {
      input: ".",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  }
}
