export function reconcile(authoritativePlayer, pendingInputs, simulateInput) {
  let result = { ...authoritativePlayer };
  for (const input of pendingInputs) result = simulateInput(result, input);
  return result;
}

export function correctionDistance(predicted, authoritative) {
  return Math.hypot(predicted.x - authoritative.x, predicted.z - authoritative.z);
}
