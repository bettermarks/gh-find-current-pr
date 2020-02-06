

async function run(
    { GitHub, context } = require('@actions/github'),
    core = require('@actions/core'),
    log = console.log,
    set = (key, value) => {
        log('setting', key, 'to', JSON.stringify(value));
        core.setOutput(key, value);
    },
    client = new GitHub(core.getInput('github-token', { required: true }), {})
) {
    const {payload, repo, sha} = context;
    const required = JSON.parse(core.getInput('required') || 'false');
    let pr = payload.pull_request;
    if (
        !pr
        && payload.repository
        && payload.ref === `refs/heads/${payload.repository.default_branch}`
    ) {
        log('Action was triggered on the default branch, so there will not be a PR');
        return;
    }
    if (!pr) {
        log(
            'payload.pull_request not available, context:',
            JSON.stringify(context)
        );
        const response = await client.repos.listPullRequestsAssociatedWithCommit({
            owner: repo.owner,
            repo: repo.repo,
            commit_sha: sha || core.getInput('sha'),
        });
        log('response', JSON.stringify(response));
        pr = response.data.find(it => it.state === 'open');
    }
    if (required && !pr) {
        throw new Error('PR could not be resolved.');
    }

    set('number', (pr && pr.number) || '');
    set('title', (pr && pr.title) || '');
    set('body', (pr && pr.body) || '');
    // the following has not been tested, but could work:
    // set('labels', pr && pr.labels ? pr.labels.map(label => label.name) : []);
    if (pr && pr.labels) {
        pr.labels.forEach(label => set(`label_${label.name}`, true));
    }
}
if (module === require.main) {
    run().catch(err => core.setFailed(err.message));
} else {
    module.exports = {run}
}
