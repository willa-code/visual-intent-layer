import { collectInstrumentation } from './measure.js';

const report = await collectInstrumentation();
console.log(JSON.stringify(report, null, 2));
