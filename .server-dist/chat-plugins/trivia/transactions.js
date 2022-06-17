"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * SQL transactions for the Trivia plugin.
 */




 const transactions = {
	addHistory: (
		args,
		env
	) => {
		const gameHistoryInsertion = env.statements.get(args.gameHistoryInsertion);
		const scoreHistoryInsertion = env.statements.get(args.scoreHistoryInsertion);
		if (!gameHistoryInsertion || !scoreHistoryInsertion) throw new Error('Statements not found');

		for (const game of args.history) {
			const {lastInsertRowid} = gameHistoryInsertion.run(
				game.mode, game.length, game.category, game.startTime, game.creator, Number(game.givesPoints)
			);
			for (const userid in game.scores) {
				scoreHistoryInsertion.run(lastInsertRowid, userid, game.scores[userid]);
			}
		}

		return true;
	},

	editQuestion(
		args,
		env,
	) {
		// Question editing is likely to be infrequent, so I've optimized for readability and proper argument checking
		// rather than performance (i.e. not passing in prepared statements).
		const {oldQuestionText, newQuestionText, newAnswers} = args;

		if (newAnswers) {
			const questionID = _optionalChain([env, 'access', _ => _.db
, 'access', _2 => _2.prepare, 'call', _3 => _3('SELECT question_id FROM trivia_questions WHERE question = ?')
, 'access', _4 => _4.get, 'call', _5 => _5(oldQuestionText), 'optionalAccess', _6 => _6.question_id]);
			if (!questionID) throw new Error('Question not found');
			env.db.prepare('DELETE FROM trivia_answers WHERE question_id = ?').run(questionID);
			const insert = env.db.prepare('INSERT INTO trivia_answers (question_id, answer) VALUES (?, ?)');
			for (const answer of newAnswers) {
				insert.run([questionID, answer]);
			}
		}

		if (newQuestionText) {
			env.db
				.prepare(`UPDATE trivia_questions SET question = ? WHERE question = ?`)
				.run([newQuestionText, oldQuestionText]);
		}
	},

	addQuestions: (
		args




,
		env
	) => {
		const questionInsertion = env.statements.get(args.questionInsertion);
		const answerInsertion = env.statements.get(args.answerInsertion);
		if (!questionInsertion || !answerInsertion) throw new Error('Statements not found');

		const isSubmissionForSQLite = Number(args.isSubmission);
		for (const question of args.questions) {
			const {lastInsertRowid} = questionInsertion.run(
				question.question, question.category, question.addedAt, question.user, isSubmissionForSQLite
			);
			for (const answer of question.answers) {
				answerInsertion.run(lastInsertRowid, answer);
			}
		}

		return true;
	},
}; exports.transactions = transactions;

 //# sourceMappingURL=sourceMaps/transactions.js.map