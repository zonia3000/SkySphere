import java.util.*;
import java.io.*;

class Star {

    public float ra, dec;

    public Star(String ra, String dec) {
        this.ra = 2 * (float) Math.PI * Float.parseFloat(ra) / 24;
        this.dec = (Float.parseFloat(dec) + 90) * 2 * (float) Math.PI / 360;
    }
}

class Parse {

    public static void main(String[] args) {
        try {
            ArrayList<Star> stars = new ArrayList<>();
            ArrayList<Integer> constellations = new ArrayList<>();
            int starIndex = -1, constellationOffset = 0, prevIndexToAdd = 0;
            char prevChar = 'C';

            ArrayList<String> constellationHD = new ArrayList<>();

            HashMap<String, Star> allStars = new HashMap<>();
            try (BufferedReader br = new BufferedReader(new FileReader("hygdata_v3.csv"))) {
                String line;
                br.readLine();
                while ((line = br.readLine()) != null) {
                    String[] lineData = line.split(",");
                    if (!lineData[2].equals("")) {
                        allStars.put(lineData[2], new Star(lineData[7], lineData[8]));
                    }
                }
            }

            // Adding missing stars (data from wikisky.org)
            allStars.put("108249", new Star("12.443472222200002", "-63.09944444399999"));
            allStars.put("24072", new Star("3.8099722222", "-37.620555556"));
            allStars.put("18623", new Star("2.9711944444666663", "-40.304444444"));
            allStars.put("68243", new Star("8.158138888866668", "-47.345833333"));

            try (BufferedReader br = new BufferedReader(new FileReader("kstars_clines.dat"))) {
                String line;
                boolean constellationsStarted = false;
                while ((line = br.readLine()) != null) {
                    char startChar = line.charAt(0);
                    
                    if (!constellationsStarted) {
                        if (startChar == 'C') {
                            // Start of Western constellations list
                            constellationsStarted = true;
                        }
                    } else {
                        
                        if (startChar == 'C') {
                            // Reached Chinese constellations list. Exit from while loop.
                            break;
                        }
                        if (startChar == '#' && prevChar == '#') {
                            // Start of a constellation
                            constellationHD.clear();
                            constellationOffset = starIndex + 1;
                        }
                        
                        if (startChar == 'M' || startChar == 'D') {
                            String hd = line.split(" ")[1];
                            int hdIndex = constellationHD.lastIndexOf(hd);
                            if (hdIndex == -1) {
                                Star star = allStars.get(hd);
                                if (star != null) {
                                    stars.add(star);
                                } else {
                                    System.err.println("Star HD " + hd + " not found!");
                                    System.exit(1);
                                }
                                constellationHD.add(hd);
                                starIndex++;
                            }
                            
                            int indexToAdd = hdIndex == -1 ? starIndex : hdIndex + constellationOffset;
                            if (startChar == 'M') {
                                constellations.add(indexToAdd);
                            } else {
                                if (prevChar == 'D') {
                                    constellations.add(prevIndexToAdd);
                                }
                                constellations.add(indexToAdd);
                            }
                            
                            prevIndexToAdd = indexToAdd;
                        }
                        
                        prevChar = startChar;
                    }
                }
            }

            // Writing output data
            try (BufferedWriter bw = new BufferedWriter(new FileWriter("constellations.js"))) {
                bw.write("define([], function() { return {\"s\":[");
                for (int i = 0; i < stars.size(); i++) {
                    Star star = stars.get(i);
                    bw.write("[" + star.ra + "," + star.dec + "]");
                    if (i < stars.size() - 1) {
                        bw.write(",");
                    }
                }
                bw.write("],\"l\":[");
                for (int i = 0; i < constellations.size(); i += 2) {
                    bw.write("[" + constellations.get(i) + "," + constellations.get(i + 1) + "]");
                    if (i < constellations.size() - 2) {
                        bw.write(",");
                    }
                }
                bw.write("]}});");
                
                System.out.println("Constellations file successfully generated! :-)");
            }
        } catch (IOException e) {
            e.printStackTrace(System.err);
        }
    }
}
