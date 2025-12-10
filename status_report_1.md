Below are the separate status reports for Chris and Jake.
# Status Report - Christopher Elchik (cwelchik)

## 1. Accomplishments

### - Created ansible scripts to deploy various app instances and set up Nginx as a reverse proxy
For context, our pipeline will have two types of instances: Production and Preview Apps (which we will call “lookasides”). There will only exist one production instance, which will run in a container on port 3000 on my VCL instance. Preview Apps (lookasides), however, will have an unbounded amount of instances in our architecture, as our pipeline will create them dynamically, since each PR will trigger the creation of a lookaside instance to “preview” the PR. Each lookaside will run in its own dynamically created container on my VCL instance, running on port 3001 + [PR ID] (this assignment methodology is temporary and we will make a more robust port allocation system in a later sprint). These ports are accessible because our VCL instances permit Docker port forwarding.

That said, in this sprint, I made an ansible script to deploy the production instance to my remote server, accessible at http://csc519-129-host.csc.ncsu.edu/. Note that you don’t need to specify the port in the url since I have Nginx (running in its own container listening on port 80) serving as a reverse proxy, directing requests from this url to the production container on port 3000. Additionally, I created another ansible script that creates a lookaside instance when you provide a PR id as a parameter. This script dynamically creates a docker container running this lookaside instance, which is completely independent in that it has its own, unshared database. The lookaside container runs on port 3001 + [PR ID], and the url to access the lookaside is http://csc519-129-host.csc.ncsu.edu/pr-[ID]/. Nginx uses the PR ID to route the requests from a given lookaside’s URL to its corresponding container, therefore permitting the concept of independent preview app instances. Unlimited lookaside instances can be made using this same script, so long that different PR ID’s are provided each time. I also created an ansible script to delete lookaside instances (which will be used when PR’s are approved/merged).

This implementation of lookaside instances is a huge step towards our CD pipeline, as we can have preview environments for reviewers/product managers to sanity check PR’s with new features before deploying. The next step will be to integrate these ansible scripts into our GitHub Actions workflows.

_[Commit Link](https://github.ncsu.edu/jfmcdavi/detector-app/commit/e29e7f3f789057c7725b024a174653c3a0701d4c)_

### - Created backend and frontend unit tests that are ready to be integrated into the pipeline
This is necessary for CI/CD so that we know a pull request’s changes will not break existing functionality. There are 20 frontend tests (written with jest) and 11 backend tests (written with pytest).

_[Commit Link - Frontend Tests](https://github.ncsu.edu/jfmcdavi/detector-app/commit/4c320bc6094d8f553bac7bce9ae5f10f7bf6e57f)_

_[Commit Link - Backend Tests](https://github.ncsu.edu/jfmcdavi/detector-app/commit/61b32f1f52a97fde2721800aca3f051d6ba551c3)_

### - Dockerized our custom app

This is necessary for continuous deployment since it makes our app portable to be run in the remote machine. I am including this as an achievement because the architecture of our app made this task non-trivial, since our app involves webcam streaming. The app now accesses the webcam through the browser, sending images to the backend (now hosted in a container on the remote machine), where we use OpenCV’s facial recognition abilities and send the result back to the frontend.

_[Commit Link](https://github.ncsu.edu/jfmcdavi/detector-app/commit/560d31a69e4c17313c38330617db5264d3cdc23f)_

## 2. Next Steps

- I will attempt to integrate the ansible scripts (both for production and preview app instances) to GitHub Actions workflows to automatically run on PR’s to release branches. This task will involve a lot of configuration-related subtasks (i.e., setting up SSH keys, GitHub secrets, etc), so I expect this task to take roughly an entire week to properly test and confirm everything works.
- I’ll also set up a better system for port allocation of lookaside instances, since they’re currently tied to PR numbers. My idea is to set up a system that assigns the lowest available port above 3000. I expect this to break the current Nginx routing system, so part of this task will also involve fixing how the reverse proxy identifies destination containers based on a given url. Depending on how fixing Nginx goes, I expect this task to take a couple days.

## 3. Retrospective for the Sprint

### What worked?

Overall, I had a good experience with figuring out the port forwarding. I originally submitted an IT ticket because I thought we would need more ports on my VCL instance to implement unbounded amounts of lookasides, but it was very doable to accomplish this with Docker containers. Making the unit tests also went rather smooth, as our app has a very simple implementation that facilitates some simple test cases we can later add to the pipeline.

### What didn't work?

One of the most difficult parts was getting the lookasides to be truly independent. This meant that each time a lookaside is created, it also needs to get its own database instance, which I had a lot of issues with because when I saved a photo on a lookaside, it would originally get shared across all instances of the app. This was tricky to debug since there were not really any error messages. Eventually, I figured out the issue was that all routes were mapping to the production instance, so I was eventually able to separate everything after a lot of trouble.

### What will be done differently next time?

If I experience any more issues with lookaside conflicts, I am now much better at checking docker logs for debugging, so I will be much more efficient with debugging in the future. Additionally, I will start every task by figuring out how to containerize it. These VCL instances effectively require that we dockerize nearly all processes (since we do not have sudo access nor do we have access to any package managers), so I understand now that I need to approach issues with containerization in mind.

# Status Report - Jake McDavitt (jfmcdavi)

## 1. Accomplishments

### - Set up Sonarqube instance on durable VCL
This is necessary for continuous deployment so that we can run code quality checks that can run automatically after making pushes or pull requests to the repository. I also set this up through the VCL within a docker container exposed from port 3000 hosted at http://csc519-146-host.csc.ncsu.edu:3000 so we can access the Web Interface for the service where we can get a more in depth analysis of our codebase to aid in development.

I also had to set up a github app with this to have it be able to connect to the repository and establish repository secrets and a private authentication key so it can checkout commits to analyze. I was able to get it most of the way set up but ran into an issue with callback urls due to shibboleth authentication which I will talk about more in the next steps section.

It temporarily uses an h2 in-memory database just for testing the connection with the service, this is temporary. In the future I need to set up a database to store users because I’ve found out the hard way if it resets the data does not persist and you have to recreate every account.

_[Commit Link](https://github.ncsu.edu/jfmcdavi/detector-app/commit/c4cc9746a167c7b7226c665b3b6b63baeb5a9f60)_

### - Created Starter GitHub Actions scripts that we can build off of
Created GitHub Actions Script to automatically run backend tests when a pull request is made from one branch to another and set up a runner to connect to the github and run our actions. This is necessary for continuous deployment because it ensures that unintended regression in functionality does not occur when trying to make changes to the codebase. Right now I'm having issues with pip installs with numpy not being able to find a suitable C++ compiler and the durable vcl will not let me install it, so I’ll probably have to set up a docker instance to host the runner on the durable vcl.

## 2. Next Steps

- Attempt to get Sonarqube working with the callback url. Right now I have sonarqube set up where you can access it from the Web interface, I still need to get it set up to where it can see the repository and analyze. An Issue I was running into was setting up a callback url within creating a github app for it. It appears like it wants to use it to automatically authenticate github users to its service but I’m running into issues with shibboleth because of that. I estimate this may take me the entire next week to get it fully working.
- Set up a database to store user information for Sonarqube. Currently Sonarqube uses an h2 database by default, which is an in-memory database which is easy to use for testing purposes but doesn’t persist data when the service fails. So in order to not have issues in the case when the container crashes, which I ran into this past sprint, I need to set up a mysql server on the durable VCL that communicates with the docker container that hosts sonarqube for it to connect to. I estimate that I will have this complete by the end of the week.
- Create a docker container to host the github runners of my durable VCL. I experimented with self-hosting a runner like we did in workshop 7 but found that some of the python packages required dependencies that I cannot install without sudo access which I do not have with the durable vcl. So what I’m going to have to do is create a simple docker container that I can host a github runner out of and install the necessary external dependencies necessary for the python packages to run for pytest. I estimate this will take me 2 days to complete.
- Extend GitHub Actions to also test Front End Tests and work with Pushing. Right now the actions script I have implemented is a simple test to try and get the backend tests to automatically run with the codebase. But it only works with pull requests right now and is only the backend tests. I need to extend it to work with pushes to branches as well and include the front end tests. This is a pretty simple change. I don't think it’ll take me longer than a day to get completely working.
- Implement Correct Branch Protection Rules to prevent feature branches from merging directly into main and prevent merges without automatic tests passing first. I need to set up the rules for the repository to maintain a structure for how branches should interact with each other and what rules they need to follow in order to be merged. All automated tests need to pass in order for a merge to be allowed so I need to set it up with both github actions but also the sonarqube code analysis for the merged codebase. Then I need to ensure that feature branches can only merge into dev and dev is the only branch that can merge into the main branch.

## 3. Retrospective for the Sprint

### What worked?

Overall Getting Sonarqube hosted to where I could access the web interface remotely went well. After getting it set up it was neat to explore it and see what services I could set up with it. I did not have many issues other than not understanding that by default sonarqube hosts itself on port 9000 but a quick docker parameter allowed me to forward it to the VCL’s port 3000 which let me easily access it from my laptop.

### What didn't work?

After setting up the GitHub app to have Sonarqube integrated with the repository I got stuck in an infinite loop where shibboleth was getting confused from the authentication request from the callback loop I had to specify and I had to start over on the configuration due to that. The docker container hosting sonarqube also crashed at one point which due to the database for it being stored as an h2 in-memory database by default caused it to lose all persistent data and I had to start the process over because of that. 
Setting up the github runner I had issues with external dependencies specifically with pytest which is necessary for anything OpenCV, it requires some type of C++ compiler which the durable VCL do not look to come with installed by default, I also tried a temporary VCL and see if NC state had any Linux runners available but nothing seemed to work in that regard. 

### What will be done differently next time?
After working with Sonarqube and github actions for a bit I feel like I have a better grasp at the actions I need to take to complete my tasks, with that I am going to split my tasks into smaller more easily achievable steps to help me visualize the progress I am making to complete the larger tasks in whole.
