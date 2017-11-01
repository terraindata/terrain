FROM node:8

WORKDIR /opt/sigint
COPY . .
RUN yarn global add typescript
RUN yarn
EXPOSE 3001
ENTRYPOINT ["yarn"]
CMD ["start"]
