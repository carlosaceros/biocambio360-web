import Foundation
import Vision
import ImageIO

let fm = FileManager.default
let dir = "Fotos_productos/kits_imagenes"
let files = try! fm.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".png") }.sorted()

for (i, file) in files.enumerated() {
    let path = "\(dir)/\(file)"
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: path)),
          let src = CGImageSourceCreateWithData(data as CFData, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        print("Failed to load \(file)")
        continue
    }
    
    let requestHandler = VNImageRequestHandler(cgImage: cg, options: [:])
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    
    try? requestHandler.perform([request])
    
    print("=== KIT \(i + 1): \(file) ===")
    if let results = request.results {
        for res in results {
            if let text = res.topCandidates(1).first?.string {
                print(text)
            }
        }
    }
    print("")
}
