const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

const set = (key, value) => {
    console.log('setting', key, 'to', JSON.stringify(value));
    core.setOutput(key, value);
};

async function main() {
    const required = JSON.parse(core.getInput('required'));
    let pr = context.payload.pull_request;
    if (!pr) {
        console.log(
            'context.payload.pull_request not available, context:',
            JSON.stringify(context)
        );
        const token = core.getInput('github-token', { required: true });
        const sha = core.getInput('sha');
        const client = new GitHub(token, {});
        const response = await client.repos.listPullRequestsAssociatedWithCommit({
            owner: context.repo.owner,
            repo: context.repo.repo,
            commit_sha: sha || context.sha,
        });
        console.log('response', JSON.stringify(response));
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

main().catch(err => core.setFailed(err.message));
