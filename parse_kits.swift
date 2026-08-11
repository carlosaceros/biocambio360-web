import Foundation
import Vision
import AppKit

let fm = FileManager.default
let dir = "Fotos_productos/kits_imagenes"
let items = try! fm.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".png") }.sorted()

for file in items {
    let url = URL(fileURLWithPath: "\(dir)/\(file)")
    guard let img = NSImage(contentsOf: url),
          let tiff = img.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let cg = rep.cgImage else {
        print("Could not load \(file)")
        continue
    }
    
    let requestHandler = VNImageRequestHandler(cgImage: cg, options: [:])
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    
    try? requestHandler.perform([request])
    
    print("\n===============================")
    print("FILE: \(file)")
    print("===============================")
    for result in request.results ?? [] {
        if let text = result.topCandidates(1).first?.string {
            print(text)
        }
    }
}
