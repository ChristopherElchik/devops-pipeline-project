Below are the separate status reports for Chris and Jake.
# Status Report 2 - Christopher Elchik (cwelchik)

## 1. Accomplishments

### - Improved port allocation system for preview app docker containers
Recall that an integral part of our pipeline involves deploying independent “preview app” instances (we also call these “lookasides” throughout the project). These preview instances are dynamically created/destroyed by our pipeline, as described in the previous status report.

Last week, we assigned port numbers for these containers to be 3001 + [PR number], where this pr number is passed as a parameter into the ansible script. This system is not very robust since we may run out of ports as PR numbers scale up.

So, this past sprint, I updated this port allocation system so that instead of tying port numbers to PR numbers, it assigns the lookaside instance container to the first available port above 3000 (where 3000 is always the production instance). This improves the pipeline because it keeps port numbers low, so we can now reuse ports after old preview instances get destroyed.

_[Commit Link](https://github.ncsu.edu/devops-team/detector-app/commit/050361053c44336368178cbb1f0611aafd877c18)_

### - Integrated preview app instance creation scripts into GitHub Actions
Last sprint, I made ansible scripts to dynamically add/remove lookaside containers when given a PR number. This sprint, I created a GitHub Actions script that is set to run every time a PR is opened, reopened, synchronized (i.e., updated), or closed. When the PR is opened to a destination branch starting with “release-*”, a preview app instance is dynamically created, where the preview app reflects the state of the code in the pull request, completely independent of all other instances of the app (it even has its own database). Once the deployment is successful, the GitHub Actions bot leaves a comment with a link to the lookaside (with format “http://csc519-129-host.csc.ncsu.edu/pr-[number]/”), accessible by anyone within NCSU. 

This is helpful since other developers/product managers can visit this link to view the app in a harmless “preview” before fully deploying to production. The actions script is also configured such that if the pull request is updated (i.e., another commit is added), the lookaside automatically rebuilds to reflect these changes. If the PR is closed (whether it is merged or denied), the lookaside/preview is automatically destroyed. This works for as many instances as the VCL machine can handle, so there is no known limit for the amount of PR’s that can be opened simultaneously.

_[Commit Link](https://github.ncsu.edu/devops-team/detector-app/commit/8c36228722cfddf28aa9ec39e6e4df7fcd959531)_

## 2. Next Steps

- Enforce unit tests as a dependency for deploying lookaside instances

Currently, on pull requests to a release branch, the lookaside gets deployed regardless of whether or not the unit tests pass. I need to enforce that if the tests fail, then no lookaside gets deployed. The fix itself should only take a few minutes to add to the workflow files, but it’ll probably take a couple hours to thoroughly test the behaviors of failing test cases and creating new instances.

- Merge changes to production once a pull request is approved

Currently, when a pull request to a release branch is approved, the preview app instance just gets destroyed. The production branch is configured to always reflect the ‘main’ branch. As such, I need to add a workflow that automatically updates the main branch to reflect the most up-to-date release branch (i.e., the one that just got merged), and then automatically rebuild the production instance to reflect these changes. This should take a couple days to complete the changes and thoroughly test to ensure that the involved instances are impacted the way they should be.

## 3. Retrospective for the Sprint

### What worked?

In this iteration, I was much better suited to face issues when testing out the preview app instances. Part of this iteration involved changing how ports were allocated. I learned a lot of lessons when building the ansible scripts last time regarding how to check log files to see where errors were happening, so when I faced issues when changing port allocations, I knew exactly where to look/what to do to diagnose the issue (i.e., Docker log files, container contents, restarting containers, etc). As a result, I was much more efficient when debugging this sprint, so that worked very well.

### What didn't work?

When I was completing the task for adding the lookaside scripts to GitHub Actions, I faced an issue with the lookasides not being truly independent. The lookasides had their own database, but rather than reflecting the state of the pull request’s code, they were all reflecting the state of the production environment. I thought this issue was solved in the last sprint, so it turned into an issue that I had to fix during this past sprint. However, I solved the issue, so now different lookasides on different pull requests are truly independent, meaning they can have different features and not impact each other.

### What will be done differently next time?

Next sprint, I will be a lot more thorough with how I test the impact of actions scripts on the lookaside instances anytime I make a change that impacts their creation. This will involve taking a deeper look into the contents of the lookaside’s container, including the docker-compose file and the database configs to be completely certain that the lookaside is configured correctly (i.e., cleared database, unique codebase, correct port allocations, etc). This will help me avoid the mistake I made in the first sprint of assuming that the lookasides were 100% independent when there were some small entanglements that went under the radar.

# Status Report 2 - Jake McDavitt (jfmcdavi)

## 1. Accomplishments

### - Set up Sonarqube docker server with a Postgresql Database and Integrated it to interact with the GitHub Repository
Last sprint, I worked on getting a Sonarqube community server hosted in a docker container off my durable vcl. But, I ran into a lot of issues setting it up and wasn’t able to get it to really interact with the pipeline in any meaningful way. This sprint I was able to get a database set up with the service and was finally able to get it to checkout code from our github repository. First, I set up a Docker compose file which launches a Sonarqube container and a Postgresql server container which is set up to connect to the service. This change should allow the service to maintain data collected even if it crashes again. 

Second, for actually configuring Sonarqube I figured out the community edition expects to interact with a GitHub App installed on an organization, where it can read data from repositories. So we reuse an old organization Chris created and moved the repository into it and I set up a new Github App and installed it within the organization. Then logging into the Sonarqube service as an admin I was able to configure it where it hosts a callback and webhook url for it to authenticate users and checkout commits from the GitHub Repository. After getting this set up correctly, any user part of the organization can log into the Sonarqube service using their GitHub account to authenticate themselves.

Lastly, to get the Sonarqube service to check out and analyze code from the repository I figured out that I could manually create a project in the server and it gave me a template for a GitHub actions yaml file to have Sonarqube checkout the codebase when it runs. I had to define a couple of repository secrets Sonarqube generated to have it authenticate, but after testing it on the dev branch, the code base was loaded into the Sonarqube service and it was able to run its style and security checks on the codebase. (Commit is with the working version of the actions yaml file).

_[Commit Link](https://github.ncsu.edu/devops-team/detector-app/commit/89927bbbe26d780f6a60b45f4df02716a1004edf)_

### - Set up a durable vcl to host our Self-hosted Github actions runner, and got backend tests working and frontend tests to also work off of the runner
I figured out how to request a longer term Virtual Computing Environment from the VCL and was able to get one to run a self-hosted linux github runner for about 30 days. Then after finally getting it working through trial and error, specifically with Python versioning within the github runner, I was able to automate the testing process for our application for both the frontend jest tests and the backend pytest tests. Originally I had it set up on push, but I changed it to be on PR and to prevent users from merging changes unless the tests pass.

## 2. Next Steps

- Have sonarqube run on pull requests to release branches and have it display some output on github about the status of the project and what issues were found from the service. Currently to test it I have it checkout code from the dev branch on push, but ideally we need this service to give info to the user when pull requests occur, and it needs to prevent users from merging if too severe of issues are detected. I phrase it like this since Sonarqube is a very robust service, there are some issues it checks for that would be unnecessary to completely halt a merge for, so I’m going to have to figure out some sort of filter for it and then cause it to prevent merges until the codebase is compliant with it’s checks. I think this should take me a couple of days to get working correctly.
- Originally I wanted to set up branch protection rules earlier but it became evident that should be one of the last steps while we’re still getting the pipeline set up. So after we have gotten the rest of our implementations we need for the pipeline, I will set up the necessary branch protection rules we want for the project. This should take me like a day.

## 3. Retrospective for the Sprint

### What worked?

In this sprint, I had more experience working with the Sonarqube service and had a better understanding of some of the help forums for it so the setup process for it went a lot smoother this time around than last time. After some troubleshooting with the GitHub app, because the community edition isn’t very clear on what permissions you need to give, I was able to get Sonarqube to authenticate and read from repositories. Also being able to host a runner from a VCL with sudo made the process a lot easier. Also to actually host the Sonarqube service with a separate container with the database I started using Docker compose which is so much nicer to load both of them at the same time.

### What didn't work?

I’m still trying to work out some kinks with the Github actions scripts and how it interacts with pull requests. I wasn’t able to figure out how to set up Sonarqube to prevent merges from happening during this sprint initially. Also currently it doesn’t display what branch it pulled from within the service, it only displays main branch (even when it’s not main branch, something with the set up but the documentation is unclear about how to fix it)

### What will be done differently next time?
Next sprint, I am going to focus more on creating robust github actions scripts and figure out how Sonarqube is able to interact with the actions on more than a base level example script that the service was able to give to me. Also, I haven’t tested if the app going down will persist the data for the users and the repositories so I need to make a point to test that just in case the service was to crash for any reason.
