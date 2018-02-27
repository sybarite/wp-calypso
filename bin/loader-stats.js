#!/usr/bin/env node
const path = require( 'path' );
const stats = require( path.join( __dirname, '..', 'server', 'bundler', 'assets.json' ) );
const _ = require( 'lodash' );
const gzipSize = require( 'gzip-size' );



function getChunkByName( name ) {
	return stats.chunks.find( chunk => chunk.names.indexOf( name ) !== -1 );
}

function getChunkById( id ) {
	return stats.chunks.find( chunk => chunk.id === id );
}

function getChunkAndSiblings( which ) {
	const mainChunk = getChunkByName( which );
	return [
		mainChunk,
		...mainChunk.siblings.map( getChunkById )
	];
}

const whichSection = process.argv[2];
const sectionChunk = getChunkByName( whichSection );

if ( ! sectionChunk ) {
	console.log( `no section chunk found for ${whichSection}` );
}

const chunksToLoad = [
	...getChunkAndSiblings( 'build' ),
	...getChunkAndSiblings( whichSection )
];

const filesToLoad = _.flatMap( chunksToLoad, chunk => {
	return chunk.files.map( file => path.join( __dirname, '..', 'public', file.replace( '/calypso/', '' ) ) );
} );

async function calculateSizes() {
	const fileSizePromises = filesToLoad.map( f => gzipSize.file( f ) );

	const fileSizes = await Promise.all( fileSizePromises );

	const filesWithSizes = _.zipObject( filesToLoad, fileSizes );

	console.log( `to load ${whichSection}:` );

	filesToLoad.forEach( f => {
		console.log( `   ${f}: (${ filesWithSizes[ f ] / 1000 }kb)`);
	})

	console.log( "Total: " + ( filesToLoad.reduce( ( totalSize, f ) => totalSize + filesWithSizes[ f ], 0 ) / 1000 ) + "kb" );
}

calculateSizes();



