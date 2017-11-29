# Domain Expert Bot - Discovery Collection Cleaner

## Installation

- Complete the cronjob.yaml file with the correct credentials and the Docker image name that you will use below

- docker build -t <image_name> .
- docker push <image_name>
- kubectl create -f cronjob.yaml