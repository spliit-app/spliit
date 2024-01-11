FROM node:slim

EXPOSE 3000/tcp
WORKDIR /usr/app
COPY ./ ./

SHELL ["/bin/bash", "-c"]

RUN apt update && \
    apt install openssl -y && \
    apt clean && \
    apt autoclean && \
    apt autoremove && \
    npm install --ignore-scripts && \
    npm install -g prisma

ENTRYPOINT ["/bin/bash", "-c", "scripts/image-startup.sh"]
