import minimist from 'minimist';

import {Main} from './main';

async function main() {
	const main = new Main();

	try {
		const params = minimist(process.argv.slice(2));
		const result = await main.exec(params.model);

		process.exit(0);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}

main();
