"use strict";

module.exports = function(grunt) {

	require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);

	grunt.initConfig({

		// Define Directory
		dirs: {
			js:     "src",
			build:  "dist"
		},

		// Metadata
		pkg: grunt.file.readJSON("package.json"),
		
		banner:
		"/*!\n" +
		" * -------------------------------------------------------\n" +
		" * Project: <%= pkg.title %>\n" +
		" * Version: <%= pkg.version %>\n" +
		" *\n" +
		" * Author:  <%= pkg.author.name %>\n" +
		" * Site:    <%= pkg.author.url %>\n" +
		" * Contact: <%= pkg.author.email %>\n" +
		" *\n" +
		" * Copyright (c) <%= grunt.template.today(\"yyyy\") %> <%= pkg.author.name %>\n" +
		" * License: <%= pkg.licenses[0].url %>\n"+
		" *\n" +
		" * Stars data credits: https://edu.kde.org/kstars, http://www.astronexus.com/hyg\n" +
		" * -------------------------------------------------------\n" +
		" */\n" +
		"\n",

		// Minify and Concat archives
		uglify: {
			options: {
				banner: "<%= banner %>",
				mangle: true,
				sequences: true,
				dead_code: true,
				conditionals: true,
				booleans: true,
				unused: true,
				if_return: true,
				join_vars: true
			},
			dist: {
				files: {
					"<%= dirs.build %>/<%= pkg.name %>.min.js": "<%= dirs.build %>/<%= pkg.name %>.js"
				}
			}
		},

		// Notifications
		notify: {
			js: {
				options: {
					title: "Javascript - <%= pkg.title %>",
					message: "Minified and validated with success!"
				}
			}
		},

		requirejs: {
			compile: {
				options: {
					findNestedDependencies: true,
					baseUrl: "<%= dirs.js %>",
					mainConfigFile: "<%= dirs.js %>/main.js",
					name: "SkySphere", 
					optimize: 'none',
					transformAMDChecks: false,
					out: "<%= dirs.build %>/<%= pkg.name %>.js",
					onModuleBundleComplete: function(data) {
						var fs = require('fs'), amdclean = require('amdclean'), outputFile = data.path;
						fs.writeFileSync(outputFile, amdclean.clean({
							filePath: outputFile,
							prefixMode: 'camelCase',
							wrap: {
								start: grunt.file.read("src/intro.js"),
								end: "\nreturn SkySphere;\n}));"
							}
						}));
					}
				}
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.registerTask( "default", [ "requirejs", "uglify" ]);
};