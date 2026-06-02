
<pre><code>FROM oven/bun:1
WORKDIR /app
COPY package.json index.js ./
RUN bun install
EXPOSE 3000
CMD ["bun", "run", "index.js"]
</code></pre>
