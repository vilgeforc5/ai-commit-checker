import * as fs from 'node:fs';
import * as path from 'node:path';
import {execSync} from 'child_process';
import Parser, {DeleteChange, InsertChange} from 'gitdiff-parser';
import {attempt, filter, find, flow, join, map, mapValues, partialRight, reduce} from 'lodash-es';
import ollama, {Ollama} from 'ollama';

import {DiffProcessor} from './diffProcessor';
import {EnumReasonSeverity, OllamaService, isSeverityHigher} from './ollama.service';

export class Main {
	async exec(model: string, log = false, severity = EnumReasonSeverity.HIGH) {
		const gitRoot = execSync('git rev-parse --show-toplevel').toString().trim();
		const modelList = await ollama.list();
		const localModel = find(modelList.models, (modelInfo) => modelInfo.name === model);

		if (!localModel) {
			throw new Error(`Couldn't find local model: ${model}`);
		}

		const diff = execSync('git diff');
		const files = Parser.parse(diff.toString());
		const diffByLineMap = DiffProcessor.getDiffByLineMap(files);

		const changeMap: Array<{content: string; fileName: string}> = flow(
			partialRight(mapValues, (diffArr: (InsertChange | DeleteChange)[][]) =>
				map(diffArr, (change) => DiffProcessor.getLineDiffProcessed(change))
			),
			partialRight(
				reduce,
				(accum: Array<{content: string; fileName: string}>, value: string[], fileName: string) => {
					return accum.concat([
						{
							content: join(
								[`Filename: ${fileName}`, `Content: ${fs.readFileSync(path.join(gitRoot, fileName))}`, ...value],
								'\n'
							),
							fileName,
						},
					]);
				},
				[]
			)
			//@ts-ignore
		)(diffByLineMap);

		const ollamaService = new OllamaService(model, new Ollama());

		const promiseFn = log ? Promise.all.bind(Promise) : Promise.allSettled.bind(Promise);

		const result = await promiseFn(
			map(changeMap, ({content, fileName}) => {
				return new Promise(async (res, rej) => {
					const response = await ollamaService.sendRequestFile(content);
					const contentStr = response.message.content;

					if (log) {
						console.log(contentStr);
					}

					const json = attempt(JSON.parse, contentStr.substring(7, contentStr.length - 3));

					if (json instanceof Error) {
						console.error('Received broken response from ollama service.');
						process.exit(1);
					}

					const isOk = isSeverityHigher(json.severity as EnumReasonSeverity, severity);

					if (isOk) {
						rej({json, fileName});
					}

					res(undefined);
				});
			})
		);

		const resultFitlered: {json: {reason: string; severity: EnumReasonSeverity}; fileName: string}[] = filter(
			result,
			(request: any) => request.status === 'rejected'
		).map((promiseResult: any) => promiseResult.reason);

		if (resultFitlered.length === 0) {
			process.exit(0);
		} else {
			resultFitlered.forEach((entry) => {
				console.log(`${entry.fileName}: ${entry.json.reason}\n`);
			});

			process.exit(1);
		}
	}
}
