const core = require('@actions/core');
const { GitHub, context } = require('@actions/github');

const set = (key, value) => {
    console.log('setting', key, 'to', JSON.stringify(value))
    core.setOutput(key, value)
}

async function main() {
    const token = core.getInput('github-token', { required: true });
    const sha = core.getInput('sha');

    const client = new GitHub(token, {});
    const result = await client.repos.listPullRequestsAssociatedWithCommit({
        owner: context.repo.owner,
        repo: context.repo.repo,
        commit_sha: sha || context.sha,
    });

    const pr = result.data.length > 0 && result.data[0];

    set('pr', pr && pr.number || '');
    set('number', pr && pr.number || '');
    set('title', pr && pr.title || '');
    set('body', pr && pr.body || '');
    if (pr && pr.labels) {
        set('labels', pr.labels.map(label => label.name));
        pr.labels.forEach((label) => set(
            `label_${label.name}`, true
        ));
    }
}

main().catch(err => core.setFailed(err.message));
