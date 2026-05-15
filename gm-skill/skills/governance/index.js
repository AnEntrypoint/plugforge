module.exports = {
  name: 'governance',
  description: 'Governance reference and verification',
  async execute(context) {
    return {
      ok: true,
      message: 'Governance skill loaded',
      constraintSets: [
        'mutable-discovery',
        'failure-taxonomy',
        'state-planes',
        'coverage-metrics'
      ]
    };
  }
};
