import { EncoderStream, DecoderStream } from '../node-index.js'
import stream from 'stream'
import chai from 'chai'
import util from 'util'
import fs from 'fs'
const finished = util.promisify(stream.finished)
var assert = chai.assert

suite('cbor-x node stream tests', function(){
	test('serialize/parse stream', () => {
		const serializeStream = new EncoderStream({
		})
		const parseStream = new DecoderStream()
		serializeStream.pipe(parseStream)
		const received = []
		parseStream.on('data', data => {
			received.push(data)
		})
		const messages = [{
			name: 'first'
		}, {
			name: 'second'
		}, {
			name: 'third'
		}, {
			name: 'third',
			extra: [1, 3, { foo: 'hi'}, 'bye']
		}]
		for (const message of messages)
			serializeStream.write(message)
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				assert.deepEqual(received, messages)
				resolve()
			}, 10)
		})
	})
	test('stream from buffer', () => new Promise(async resolve => {
		const parseStream = new DecoderStream()
		let values = []
		parseStream.on('data', (value) => {
			values.push(value)
		})
		parseStream.on('end', () => {
			assert.deepEqual(values, [1, 2])
			resolve()
		})
		let bufferStream = new stream.Duplex()
		bufferStream.pipe(parseStream)
		bufferStream.push(new Uint8Array([1, 2]))
		bufferStream.push(null)
	}))
	test('stream to/from file', (done) => {
		const recordNum = 10000

		const enc = new EncoderStream({
			// TODO this doesn't encode properly in iterated (stream) mode
			bundleStrings: false,
		})

		let verify = [];
		const read = () => {
			console.time('READ')

			const dec = new DecoderStream({
				bundleStrings: false,
			})

			fs.createReadStream('test.cbor')
				.on('data', (c) => console.log('read', c.length))
				.pipe(dec)
				.on('data', (c) => {
					let item = verify.shift()
					assert.deepEqual(c, item)
				})
				.on('end', () => console.timeEnd('READ') || done())

		}

		enc.pipe(fs.createWriteStream('test.cbor'))
		enc.on('end', () => console.timeEnd('GEN') || read())

		console.log('Generating')

		console.time('GEN')

		for (let i = 0; i < recordNum; ++i) {
			let item ={ i, str: "TEST_STR\u2500", a:['mixed'], oh: {}, ex: 'EXTRA_STR', ts: Date.now() }
			item.oh['Annoy' + i] = 'MORE DATA'
			verify.push(item)
			enc.write(item)
		}

		enc.end()
	})

	teardown(function() {
		try {
			fs.unlinkSync('test.cbor')
		}catch(error){}
	})
})

