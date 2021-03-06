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
    const { eventName, payload, ref, repo, sha } = context;
    const required = JSON.parse(core.getInput('required') || 'false');
    let pr = payload.pull_request;

    if (
        !pr &&
        payload.repository &&
        ref === `refs/heads/${payload.repository.default_branch}`
    ) {
        console.error('reached', eventName, sha, payload.sha);
        if (eventName !== 'status') {
            log('Action was triggered on the default branch, so there will not be a PR');
            return;
        }
        if (eventName === 'status' && sha === payload.sha) {
            log('Action was triggered for status on the default branch, so there will not be a PR');
            return;
        }
    }
    if (!pr) {
        log('payload.pull_request not available, context:', JSON.stringify(context));
        const response = await client.repos.listPullRequestsAssociatedWithCommit({
            owner: repo.owner,
            repo: repo.repo,
            commit_sha: payload.sha || sha || core.getInput('sha'),
        });
        log('response', JSON.stringify(response));
        pr = response.data.find(it => it.state === 'open');
    }
    if (required && !pr) {
        core.setFailed('PR could not be resolved.');
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

const main = (github = require('@actions/github'), core = require('@actions/core')) =>
    run(github, core).catch(err => core.setFailed(err.message));

if (module === require.main) {
    // noinspection JSIgnoredPromiseFromCall
    main();
} else {
    module.exports = { main, run };
}
