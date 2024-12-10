import {Change, ChangeType, DeleteChange, File, Hunk, InsertChange} from 'gitdiff-parser';
import {compact, extend, filter, find, flatMap, flow, groupBy, partialRight, property, reduce, values} from 'lodash-es';

type FileName = Branded<string, 'FileName'>;

export class DiffProcessor {
	private static changeTypeToTextMap: Record<ChangeType, string> = {
		delete: 'Deleted',
		insert: 'Added',
		normal: 'Not changed',
	};

	static getDiffByLineMap(diffFiles: File[]): Record<FileName, Array<Array<InsertChange | DeleteChange>>> {
		return reduce(
			diffFiles,
			(accum, file) => {
				const fileInfoMap = flow([
					compact,
					partialRight(flatMap, (hunk: Hunk) => hunk.changes),
					partialRight(filter, ({type}: Change) => type === 'insert' || type === 'delete'),
					partialRight(groupBy, property('lineNumber')),
					values,
				])(file.hunks);

				return extend(accum, {[file.newPath]: fileInfoMap});
			},
			{}
		);
	}

	static getLineDiffProcessed(changes: Array<InsertChange | DeleteChange>) {
		switch (changes.length) {
			case 1:
				const {type, lineNumber, content} = changes[0];

				return `${this.changeTypeToTextMap[type]} content: ${content} at line ${lineNumber}`;

			case 2:
				const inserted = find(changes, (change) => change.type === 'insert');
				const deleted = find(changes, (change) => change.type === 'delete');

				if (!inserted || !deleted) {
					return '';
				}

				return `Replace content: ${inserted.content} with ${deleted.content} at line ${inserted.lineNumber}`;

			default:
				return '';
		}
	}
}
