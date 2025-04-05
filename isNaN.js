'use strict';

/** 
 * Custom implementation of isNaN to fix build issues with math-intrinsics
 */
module.exports = Number.isNaN || function isNaN(a) {
	return a !== a;
};