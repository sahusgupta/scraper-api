# Fetching the minified node image on apline linux
FROM node:14

# Declaring env
ENV NODE_ENV development

# Setting up the work directory
WORKDIR /express-docker

# Copying all the files in our project
COPY . .

# Installing dependencies
RUN npm install

# Starting our application
CMD [ "node", "endpoints.js" ]

# Exposing server port
EXPOSE 5000
