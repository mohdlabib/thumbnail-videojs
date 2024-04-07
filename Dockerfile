# Menggunakan node.js versi 14 sebagai base image
FROM node:14

# Menentukan direktori kerja di dalam container
WORKDIR /usr/src/app

# Menyalin package.json dan package-lock.json ke dalam container
COPY package*.json ./

# Menginstal dependensi npm
RUN npm install

# Menyalin seluruh kode sumber aplikasi ke dalam container
COPY . .

# Mengexpose port yang digunakan oleh aplikasi
EXPOSE 3000

# Menjalankan aplikasi saat container dimulai
CMD ["node", "main.js"]
