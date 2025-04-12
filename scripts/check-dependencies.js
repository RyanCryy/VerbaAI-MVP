const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Path to node_modules
const nodeModulesPath = path.join(__dirname, "..", "node_modules")
const nodeModulesExists = fs.existsSync(nodeModulesPath)

// Check if node_modules exists
if (!nodeModulesExists) {
  console.log("🔍 node_modules not found. Installing dependencies...")
  try {
    execSync("npm install --legacy-peer-deps", { stdio: "inherit" })
    console.log("✅ Dependencies installed successfully!")
  } catch (error) {
    console.error("❌ Failed to install dependencies:", error.message)
    process.exit(1)
  }
} else {
  console.log("✅ Dependencies are already installed.")
}

console.log("🚀 Starting development server...")
