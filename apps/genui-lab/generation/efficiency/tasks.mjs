import {changes} from '../b05/plan.mjs'

const baggage = 'A bag weighs 10–40 whole kg, initially 38. Economy allowance is 23 kg and Business allowance is 32 kg. Gold adds 5 kg and International adds 2 kg. Start at Economy, Gold, International. The fee is $15 per excess kg. Include controls for all four inputs.'
export const visualizations = {
 fee: baggage+' Plot the fee in dollars at every whole weight and indicate the selected weight.',
 policies: baggage+' Compare old $15 and new $20 per excess kg in two labeled series at every whole weight. Indicate the selected weight.',
 tide: 'Plot harbor depth in metres at hours 0 through 5. The six readings are 2, 3, 5, 4, 2, 1 metres. A datum adjustment control ranges from -1 to 1 whole metres, initially 0. Add that adjustment to every reading.',
 kiln: 'Plot kiln temperature in degrees Celsius at minutes 0 through 6. Start at 20 degrees, rise by 30 degrees per minute until minute 3, then hold that temperature. Compare against a second run rising by 20 degrees per minute for the same three minutes.',
 archive: 'Plot the number of pages remaining after each whole day from 0 through 8. Start with 30 pages. A control selects a daily pace of 3 to 6 whole pages, initially 4. Remaining pages cannot go below zero.'
}
export const revisions = {
 baggage:{origin:'saved B04',changes},
 tickets:{origin:'Build a ticket calculator. Count is 1 to 5 whole tickets, initially 2. Each ticket costs 8 dollars. Show total dollars.',changes:[
 'Add an Adult or Child selector, default Adult. Children pay 5 dollars per ticket. Keep my selections.',
 'Change the child price to 4 dollars. Add a metric for the savings compared with adult tickets.',
 'Put the savings metric before the total. Label it Group savings ($). Keep the same behavior.']},
 water:{origin:'Build a water tank calculator. Elapsed time is 0–6 whole minutes, initially 2. A tank starts with 24 litres and drains 3 litres per minute. Show remaining litres.',changes:[
 'Add a control for the drain rate, 2–5 whole litres per minute, initially 3. Stop at zero litres.',
 'Add a line plot of remaining litres at each whole minute from 0 through 6 for the chosen rate.',
 'Replace the plot with a metric for litres drained by the selected time. Retain the remaining-litres metric.']},
 fabric:{origin:'Build a cloth estimator. Panel count is 1–4 whole panels, initially 2. Each requires 3 metres of cloth. Show total metres.',changes:[
 'Add a hem allowance control, 0–2 whole metres per panel, initially 0. Include hems in the total.',
 'Show the cost in dollars at 6 dollars per metre as a separate metric.',
 'Change the cost to 5 dollars per metre for orders totaling at least 12 metres. Keep the other controls and metrics.']}
}
