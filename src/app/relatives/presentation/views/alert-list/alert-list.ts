import {Component, computed, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RelativesStore} from "../../../application/relatives.store";
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-alert-list',
    imports: [
        MatCardContent,
        MatCardTitle,
        MatCardHeader,
        MatCard,
        TranslatePipe
    ],
  templateUrl: './alert-list.html',
  styleUrl: './alert-list.css'
})
export class AlertList implements OnInit {

    private relativesStore = inject(RelativesStore);
    private route = inject(ActivatedRoute);

    relative = computed(() => this.relativesStore.selectedRelative());

    ngOnInit() {
        const relativeId = this.route.snapshot.parent?.params['id'];
        if (relativeId) {
            const id = parseInt(relativeId, 10);
            if (id) {
                this.relativesStore.loadRelativeById(id);
            }
        }
    }

    formatDate(date: string) {
        return new Date(date).toLocaleDateString();
    }
}
