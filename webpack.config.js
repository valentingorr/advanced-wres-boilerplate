const path = require("path");
 
module.exports = {
	devServer: {
		historyApiFallback: true,
	},
	mode: process.env.NODE_ENV === "production" ? "production" : "development",
	entry: "./src/index.jsx",
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							"@babel/preset-env",
							"@babel/preset-react"
						]
					}
				}
			},
			{
				test: /\.css$/,
				exclude: /node_modules/,
				use: [
					"style-loader",
					"css-loader"
				]
			},
			{
				test: /\.scss$/,
				exclude: /node_modules/,
				use: [
					"style-loader",
					"css-loader",
					"sass-loader"
				]
			},
			{
				test: /\.(png|jp(e*)g)$/,
				exclude: /node_modules/,
				use: [{
					loader: "url-loader",
					options: {
						limit: 8000,
						name: "images/[hash]-[name].[ext]"
					}
				}]
			},
			{
				test: /\.svg$/,
				exclude: /node_modules/,
				use: ["@svgr/webpack", "url-loader"]
			}
		]
	},
	plugins: [],
	output: {
		filename: "app.bundle.js",
		path: path.resolve(__dirname, "./dist"),
		publicPath: "/"
	}
};